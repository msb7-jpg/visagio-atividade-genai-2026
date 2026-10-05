"""Testes unitários para o serializador de dados no formato tabular TOON."""

from app.agent.prompts.toon_serializer import serialize_record_value, serialize_to_toon_tabular


def test_serialize_record_value_primitives():
    """Valida a serialização segura de números, strings simples e valores nulos."""
    assert serialize_record_value(None) == ""
    assert serialize_record_value(123) == "123"
    assert serialize_record_value(45.67) == "45.67"
    assert serialize_record_value("Simples") == "Simples"


def test_serialize_record_value_escaping():
    """Valida que strings com vírgula, aspas ou dois-pontos recebem aspas e escape."""
    assert serialize_record_value("Avatar: O Caminho da Água") == '"Avatar: O Caminho da Água"'
    assert serialize_record_value("Comédia, Drama") == '"Comédia, Drama"'
    assert serialize_record_value('Filme com "aspas"') == '"Filme com \\"aspas\\""'


def test_serialize_to_toon_tabular_empty_dataset():
    """Valida a representação de conjunto de dados vazio."""
    assert serialize_to_toon_tabular("dados_analiticos", []) == "dados_analiticos[0]: vazio"


def test_serialize_to_toon_tabular_uniform_records():
    """Valida a geração da especificação tabular TOON com cabeçalho único e linhas formatadas."""
    mock_records: list[dict[str, object]] = [
        {
            "titulo": "Avatar: The Way of Water",
            "ano_lancamento": 2022,
            "sk_movie_id": "hash-avatar-123",
            "receita_brl": 12390136500.54,
        },
        {
            "titulo": "Avengers: Endgame",
            "ano_lancamento": 2019,
            "sk_movie_id": "hash-avengers-456",
            "receita_brl": 11094720000.0,
        },
    ]

    toon_result = serialize_to_toon_tabular("filmes_bilheteria", mock_records)
    result_lines = toon_result.split("\n")

    assert result_lines[0] == "filmes_bilheteria[2]{titulo,ano_lancamento,sk_movie_id,receita_brl}:"
    assert result_lines[1] == '  "Avatar: The Way of Water",2022,hash-avatar-123,12390136500.54'
    assert result_lines[2] == '  "Avengers: Endgame",2019,hash-avengers-456,11094720000.0'


def test_serialize_to_toon_tabular_handles_none_values():
    """Valida que registros com campos nulos produzem células vazias entre delimitadores."""
    mock_records: list[dict[str, object]] = [
        {"titulo": "Filme Sem Orcamento", "orcamento_brl": None, "receita_brl": 1000.0},
    ]

    toon_result = serialize_to_toon_tabular("filmes_incompletos", mock_records)
    result_lines = toon_result.split("\n")

    assert result_lines[0] == "filmes_incompletos[1]{titulo,orcamento_brl,receita_brl}:"
    assert result_lines[1] == "  Filme Sem Orcamento,,1000.0"
